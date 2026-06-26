package main

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"io"
	"math"

	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

const (
	maxFileSize  = 20 << 20 // 20MB
	maxPixels    = 100_000_000
	maxDimension = 16_384
)

var errFileTooLarge = errors.New("file exceeds the 20MB limit")

type compressionOptions struct {
	OutputFormat   string
	Quality        int
	ResizeWidth    int
	ResizeHeight   int
	MaintainAspect bool
}

func decodeImage(r io.Reader) (image.Image, string, []byte, error) {
	data, err := io.ReadAll(io.LimitReader(r, maxFileSize+1))
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to read upload")
	}
	if len(data) > maxFileSize {
		return nil, "", nil, errFileTooLarge
	}

	config, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		if errors.Is(err, image.ErrFormat) {
			return nil, "", nil, fmt.Errorf("only JPEG, PNG, and WebP images are supported")
		}
		return nil, "", nil, fmt.Errorf("failed to decode image metadata")
	}

	if config.Width <= 0 || config.Height <= 0 {
		return nil, "", nil, fmt.Errorf("image dimensions are invalid")
	}
	if int64(config.Width)*int64(config.Height) > maxPixels {
		return nil, "", nil, fmt.Errorf("image exceeds the 100MP pixel limit")
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to decode image pixels")
	}

	return img, format, data, nil
}

func maybeResize(src image.Image, opts compressionOptions) (image.Image, int, int, error) {
	bounds := src.Bounds()
	srcWidth := bounds.Dx()
	srcHeight := bounds.Dy()

	dstWidth, dstHeight := targetDimensions(srcWidth, srcHeight, opts)
	if dstWidth <= 0 || dstHeight <= 0 {
		return nil, 0, 0, fmt.Errorf("resize dimensions are invalid")
	}
	if int64(dstWidth)*int64(dstHeight) > maxPixels {
		return nil, 0, 0, fmt.Errorf("resized image exceeds the 100MP pixel limit")
	}
	if dstWidth == srcWidth && dstHeight == srcHeight {
		return src, srcWidth, srcHeight, nil
	}

	dst := image.NewRGBA(image.Rect(0, 0, dstWidth, dstHeight))
	xdraw.CatmullRom.Scale(dst, dst.Bounds(), src, bounds, xdraw.Over, nil)
	return dst, dstWidth, dstHeight, nil
}

func targetDimensions(srcWidth int, srcHeight int, opts compressionOptions) (int, int) {
	if opts.ResizeWidth == 0 && opts.ResizeHeight == 0 {
		return srcWidth, srcHeight
	}

	if !opts.MaintainAspect {
		width := opts.ResizeWidth
		height := opts.ResizeHeight
		if width == 0 {
			width = srcWidth
		}
		if height == 0 {
			height = srcHeight
		}
		return width, height
	}

	aspect := float64(srcWidth) / float64(srcHeight)
	if opts.ResizeWidth > 0 && opts.ResizeHeight > 0 {
		scale := math.Min(float64(opts.ResizeWidth)/float64(srcWidth), float64(opts.ResizeHeight)/float64(srcHeight))
		return maxInt(1, int(math.Round(float64(srcWidth)*scale))), maxInt(1, int(math.Round(float64(srcHeight)*scale)))
	}
	if opts.ResizeWidth > 0 {
		return opts.ResizeWidth, maxInt(1, int(math.Round(float64(opts.ResizeWidth)/aspect)))
	}
	return maxInt(1, int(math.Round(float64(opts.ResizeHeight)*aspect))), opts.ResizeHeight
}

func encodeImage(img image.Image, outputFormat string, quality int) ([]byte, string, error) {
	var out bytes.Buffer
	switch outputFormat {
	case "jpeg":
		if err := jpeg.Encode(&out, flattenForJPEG(img), &jpeg.Options{Quality: quality}); err != nil {
			return nil, "", err
		}
		return out.Bytes(), "image/jpeg", nil
	case "png":
		encoder := png.Encoder{CompressionLevel: png.BestCompression}
		if err := encoder.Encode(&out, img); err != nil {
			return nil, "", err
		}
		return out.Bytes(), "image/png", nil
	default:
		return nil, "", fmt.Errorf("unsupported output format")
	}
}

func flattenForJPEG(src image.Image) image.Image {
	bounds := src.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, bounds.Dx(), bounds.Dy()))
	xdraw.Draw(dst, dst.Bounds(), &image.Uniform{C: color.White}, image.Point{}, xdraw.Src)
	xdraw.Draw(dst, dst.Bounds(), src, bounds.Min, xdraw.Over)
	return dst
}

func maxInt(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
