package image

import (
	"fmt"
	"image"
	"math"

	xdraw "golang.org/x/image/draw"
)

func Resize(src image.Image, opts CompressionOptions) (image.Image, int, int, error) {

	bounds := src.Bounds()
	srcWidth := bounds.Dx()
	srcHeight := bounds.Dy()

	dstWidth, dstHeight := targetDimensions(srcWidth, srcHeight, opts)
	if dstWidth <= 0 || dstHeight <= 0 {
		return nil, 0, 0, fmt.Errorf("resize dimensions are invalid")
	}
	if int64(dstWidth)*int64(dstHeight) > MaxPixels {
		return nil, 0, 0, fmt.Errorf("resized image exceeds the 100MP pixel limit")
	}
	if dstWidth == srcWidth && dstHeight == srcHeight {
		return src, srcWidth, srcHeight, nil
	}

	dst := image.NewRGBA(image.Rect(0, 0, dstWidth, dstHeight))
	xdraw.CatmullRom.Scale(dst, dst.Bounds(), src, bounds, xdraw.Over, nil)
	return dst, dstWidth, dstHeight, nil
}

func targetDimensions(srcWidth int, srcHeight int, opts CompressionOptions) (int, int) {
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

func maxInt(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
