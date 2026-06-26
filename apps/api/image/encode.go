package image

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"

	xdraw "golang.org/x/image/draw"
)

func Encode(
	img image.Image, outputFormat string, quality int) ([]byte, string, error) {
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
