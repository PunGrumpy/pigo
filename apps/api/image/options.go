package image

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

func ParseOptions(r *http.Request) (CompressionOptions, error) {
	quality := 82
	if value := strings.TrimSpace(r.FormValue("quality")); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 1 || parsed > 100 {
			return CompressionOptions{}, fmt.Errorf("quality must be an integer from 1 to 100")
		}
		quality = parsed
	}

	outputFormat := strings.ToLower(strings.TrimSpace(r.FormValue("outputFormat")))
	if outputFormat == "" {
		outputFormat = "same"
	}

	if outputFormat != "same" &&
		outputFormat != "jpeg" &&
		outputFormat != "png" {
		return CompressionOptions{}, fmt.Errorf(`outputFormat must be "same", "jpeg", or "png"`)
	}

	width, err := parseOptionalDimension(
		r.FormValue("resizeWidth"),
		"resizeWidth",
	)
	if err != nil {
		return CompressionOptions{}, err
	}

	height, err := parseOptionalDimension(
		r.FormValue("resizeHeight"),
		"resizeHeight",
	)
	if err != nil {
		return CompressionOptions{}, err
	}

	maintainAspect := true
	if value := strings.TrimSpace(r.FormValue("maintainAspect")); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err != nil {
			return CompressionOptions{}, fmt.Errorf("maintainAspect must be true or false")
		}
		maintainAspect = parsed
	}

	return CompressionOptions{
		OutputFormat:   outputFormat,
		Quality:        quality,
		ResizeWidth:    width,
		ResizeHeight:   height,
		MaintainAspect: maintainAspect,
	}, nil
}

func parseOptionalDimension(value, field string) (int, error) {
	value = strings.TrimSpace(value)

	if value == "" {
		return 0, nil
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 || parsed > MaxDimension {
		return 0, fmt.Errorf("%s must be an integer from 1 to %d", field, MaxDimension)
	}

	return parsed, nil
}
