package core

import (
	"bytes"
	"image"
	"image/color"
	"strings"
	"testing"
)

func TestEncodeJPEGRoundTrip(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 10, 10))
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			src.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}

	data, contentType, err := Encode(src, "jpeg", 90)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if contentType != "image/jpeg" {
		t.Fatalf("got contentType %q, want %q", contentType, "image/jpeg")
	}

	decoded, format, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("failed to decode encoded jpeg: %v", err)
	}
	if format != "jpeg" {
		t.Fatalf("got format %q, want %q", format, "jpeg")
	}
	bounds := decoded.Bounds()
	if bounds.Dx() != 10 || bounds.Dy() != 10 {
		t.Fatalf("got dims %v, want 10x10", bounds)
	}
}

func TestEncodeJPEGFlattensTransparency(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 10, 10))
	// Fully transparent source; flattenForJPEG composites onto white.
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			src.Set(x, y, color.RGBA{R: 0, G: 0, B: 0, A: 0})
		}
	}

	data, _, err := Encode(src, "jpeg", 90)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	decoded, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("failed to decode encoded jpeg: %v", err)
	}

	r, g, b, _ := decoded.At(5, 5).RGBA()
	// JPEG is lossy, so allow a small tolerance around pure white (65535).
	const tolerance = 2000
	if r < 65535-tolerance || g < 65535-tolerance || b < 65535-tolerance {
		t.Fatalf("expected sampled pixel near white, got r=%d g=%d b=%d", r, g, b)
	}
}

func TestEncodeJPEGOpaqueSourceSkipsFlattenCopy(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 10, 10))
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			src.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}
	if !src.Opaque() {
		t.Fatalf("test fixture must be fully opaque")
	}

	data, contentType, err := Encode(src, "jpeg", 90)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if contentType != "image/jpeg" {
		t.Fatalf("got contentType %q, want %q", contentType, "image/jpeg")
	}

	decoded, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("failed to decode encoded jpeg: %v", err)
	}

	r, g, b, _ := decoded.At(5, 5).RGBA()
	wantR, wantG, wantB := uint32(200*257), uint32(100*257), uint32(50*257)
	// JPEG is lossy, so allow a small tolerance around the source color.
	const tolerance = 2000
	if diff := absDiff(r, wantR); diff > tolerance {
		t.Fatalf("got r=%d, want near %d (diff %d)", r, wantR, diff)
	}
	if diff := absDiff(g, wantG); diff > tolerance {
		t.Fatalf("got g=%d, want near %d (diff %d)", g, wantG, diff)
	}
	if diff := absDiff(b, wantB); diff > tolerance {
		t.Fatalf("got b=%d, want near %d (diff %d)", b, wantB, diff)
	}
}

func absDiff(a, b uint32) uint32 {
	if a > b {
		return a - b
	}
	return b - a
}

func TestEncodePNGRoundTrip(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 12, 8))

	data, contentType, err := Encode(src, "png", 82)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if contentType != "image/png" {
		t.Fatalf("got contentType %q, want %q", contentType, "image/png")
	}

	decoded, format, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("failed to decode encoded png: %v", err)
	}
	if format != "png" {
		t.Fatalf("got format %q, want %q", format, "png")
	}
	bounds := decoded.Bounds()
	if bounds.Dx() != 12 || bounds.Dy() != 8 {
		t.Fatalf("got dims %v, want 12x8", bounds)
	}
}

func TestEncodePNGIgnoresQuality(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 20, 20))
	for y := 0; y < 20; y++ {
		for x := 0; x < 20; x++ {
			src.Set(x, y, color.RGBA{R: uint8(x * 10), G: uint8(y * 10), B: 128, A: 255})
		}
	}

	low, _, err := Encode(src, "png", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	high, _, err := Encode(src, "png", 90)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !bytes.Equal(low, high) {
		t.Fatalf("expected identical png bytes regardless of quality (current behavior: quality is ignored for png)")
	}
}

func TestEncodeUnsupportedFormat(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 5, 5))
	_, _, err := Encode(src, "gif", 82)
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "unsupported output format") {
		t.Fatalf("got error %q, want it to contain %q", err.Error(), "unsupported output format")
	}
}
