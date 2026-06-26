package image

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"io"
)

func Decode(r io.Reader) (image.Image, string, []byte, error) {
	data, err := io.ReadAll(io.LimitReader(r, MaxFileSize+1))
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to read upload")
	}
	if len(data) > MaxFileSize {
		return nil, "", nil, ErrFileTooLarge
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
	if int64(config.Width)*int64(config.Height) > MaxPixels {
		return nil, "", nil, fmt.Errorf("image exceeds the 100MP pixel limit")
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, "", nil, fmt.Errorf("failed to decode image pixels")
	}

	return img, format, data, nil
}
