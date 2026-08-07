package core

import (
	"bytes"
	"encoding/binary"
	"errors"
	"hash/crc32"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"strings"
	"testing"
	"time"
)

func TestDecodePNGHappyPath(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 5, 5))
	var buf bytes.Buffer
	if err := png.Encode(&buf, src); err != nil {
		t.Fatalf("failed to encode fixture png: %v", err)
	}

	img, format, data, err := Decode(bytes.NewReader(buf.Bytes()))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if format != "png" {
		t.Fatalf("got format %q, want %q", format, "png")
	}
	if len(data) != buf.Len() {
		t.Fatalf("got data length %d, want %d", len(data), buf.Len())
	}
	bounds := img.Bounds()
	if bounds.Dx() != 5 || bounds.Dy() != 5 {
		t.Fatalf("got dims %v, want 5x5", bounds)
	}
}

func TestDecodeJPEGHappyPath(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 5, 5))
	for y := 0; y < 5; y++ {
		for x := 0; x < 5; x++ {
			src.Set(x, y, color.RGBA{R: 100, G: 150, B: 200, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, src, nil); err != nil {
		t.Fatalf("failed to encode fixture jpeg: %v", err)
	}

	img, format, data, err := Decode(bytes.NewReader(buf.Bytes()))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if format != "jpeg" {
		t.Fatalf("got format %q, want %q", format, "jpeg")
	}
	if len(data) != buf.Len() {
		t.Fatalf("got data length %d, want %d", len(data), buf.Len())
	}
	bounds := img.Bounds()
	if bounds.Dx() != 5 || bounds.Dy() != 5 {
		t.Fatalf("got dims %v, want 5x5", bounds)
	}
}

func TestDecodeGarbageBytes(t *testing.T) {
	_, _, _, err := Decode(bytes.NewReader([]byte("not an image, just garbage bytes")))
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "only JPEG, PNG, and WebP") {
		t.Fatalf("got error %q, want it to contain %q", err.Error(), "only JPEG, PNG, and WebP")
	}
}

func TestDecodeTooLarge(t *testing.T) {
	_, _, _, err := Decode(bytes.NewReader(make([]byte, MaxFileSize+1)))
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, ErrFileTooLarge) {
		t.Fatalf("got error %v, want errors.Is(err, ErrFileTooLarge)", err)
	}
}

// pngHeader builds a minimal PNG (signature + IHDR chunk only, no IDAT/IEND)
// declaring the given width and height. image.DecodeConfig only needs the
// IHDR chunk to report dimensions, which lets the pixel-limit gate in
// Decode reject the image before a full pixel decode is attempted.
func pngHeader(w, h uint32) []byte {
	var buf bytes.Buffer
	buf.Write([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'})

	ihdrData := make([]byte, 13)
	binary.BigEndian.PutUint32(ihdrData[0:4], w)
	binary.BigEndian.PutUint32(ihdrData[4:8], h)
	ihdrData[8] = 8 // bit depth
	ihdrData[9] = 6 // color type: RGBA
	ihdrData[10] = 0
	ihdrData[11] = 0
	ihdrData[12] = 0

	chunkTypeAndData := append([]byte("IHDR"), ihdrData...)

	var lengthBuf [4]byte
	binary.BigEndian.PutUint32(lengthBuf[:], uint32(len(ihdrData)))
	buf.Write(lengthBuf[:])
	buf.Write(chunkTypeAndData)

	crc := crc32.ChecksumIEEE(chunkTypeAndData)
	var crcBuf [4]byte
	binary.BigEndian.PutUint32(crcBuf[:], crc)
	buf.Write(crcBuf[:])

	return buf.Bytes()
}

func TestDecodePixelLimitRejectedBeforeFullDecode(t *testing.T) {
	// 20000 x 6000 = 120,000,000 px > MaxPixels (100,000,000), declared via
	// a hand-built PNG header only (no pixel data present at all).
	header := pngHeader(20000, 6000)

	start := time.Now()
	_, _, _, err := Decode(bytes.NewReader(header))
	elapsed := time.Since(start)

	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "100MP pixel limit") {
		t.Fatalf("got error %q, want it to contain %q", err.Error(), "100MP pixel limit")
	}
	// Proves no full pixel decode was attempted: a real 120MP decode would
	// take far longer than this budget.
	if elapsed > 500*time.Millisecond {
		t.Fatalf("decode took %v, expected a fast rejection based on header alone", elapsed)
	}
}
