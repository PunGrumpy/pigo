package core

import (
	"image"
	"strings"
	"testing"
)

func TestTargetDimensions(t *testing.T) {
	tests := []struct {
		name       string
		srcWidth   int
		srcHeight  int
		opts       CompressionOptions
		wantWidth  int
		wantHeight int
	}{
		{
			name:       "no resize returns source dimensions",
			srcWidth:   1920,
			srcHeight:  1080,
			opts:       CompressionOptions{MaintainAspect: true},
			wantWidth:  1920,
			wantHeight: 1080,
		},
		{
			name:      "both set, maintain aspect, scales to fit both bounds",
			srcWidth:  4000,
			srcHeight: 3000,
			opts: CompressionOptions{
				MaintainAspect: true,
				ResizeWidth:    1000,
				ResizeHeight:   1000,
			},
			wantWidth:  1000,
			wantHeight: 750,
		},
		{
			name:      "width-only, maintain aspect",
			srcWidth:  4000,
			srcHeight: 3000,
			opts: CompressionOptions{
				MaintainAspect: true,
				ResizeWidth:    2000,
			},
			wantWidth:  2000,
			wantHeight: 1500,
		},
		{
			name:      "height-only, maintain aspect",
			srcWidth:  4000,
			srcHeight: 3000,
			opts: CompressionOptions{
				MaintainAspect: true,
				ResizeHeight:   1500,
			},
			wantWidth:  2000,
			wantHeight: 1500,
		},
		{
			name:      "maintain aspect off, one dimension zero-filled from source",
			srcWidth:  1920,
			srcHeight: 1080,
			opts: CompressionOptions{
				MaintainAspect: false,
				ResizeWidth:    800,
			},
			wantWidth:  800,
			wantHeight: 1080,
		},
		{
			name:      "maintain aspect off, height set width zero-filled",
			srcWidth:  1920,
			srcHeight: 1080,
			opts: CompressionOptions{
				MaintainAspect: false,
				ResizeHeight:   600,
			},
			wantWidth:  1920,
			wantHeight: 600,
		},
		{
			name:      "explicit width and height when aspect not maintained",
			srcWidth:  1920,
			srcHeight: 1080,
			opts: CompressionOptions{
				MaintainAspect: false,
				ResizeWidth:    800,
				ResizeHeight:   600,
			},
			wantWidth:  800,
			wantHeight: 600,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotWidth, gotHeight := targetDimensions(tt.srcWidth, tt.srcHeight, tt.opts)
			if gotWidth != tt.wantWidth || gotHeight != tt.wantHeight {
				t.Fatalf("targetDimensions(%d, %d, %+v) = (%d, %d), want (%d, %d)",
					tt.srcWidth, tt.srcHeight, tt.opts, gotWidth, gotHeight, tt.wantWidth, tt.wantHeight)
			}
		})
	}
}

func TestTargetDimensionsExtremeRatioClamp(t *testing.T) {
	// Extreme aspect ratio: 10000x1 source, resize height to 1 with aspect
	// maintained. Both dimensions must clamp to at least 1 via max(1, ...).
	width, height := targetDimensions(10000, 1, CompressionOptions{
		MaintainAspect: true,
		ResizeHeight:   1,
	})
	if width < 1 || height < 1 {
		t.Fatalf("expected both dimensions >= 1, got (%d, %d)", width, height)
	}
}

func TestResizeSameSizeReturnsIdenticalImage(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 40, 30))
	result, width, height, err := Resize(src, CompressionOptions{MaintainAspect: true})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if width != 40 || height != 30 {
		t.Fatalf("got dims (%d, %d), want (40, 30)", width, height)
	}
	if result != image.Image(src) {
		t.Fatalf("expected same-size Resize to return the identical image, got a copy")
	}
}

func TestResizeDownscaleReturnsNewBounds(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 40, 30))
	result, width, height, err := Resize(src, CompressionOptions{
		MaintainAspect: true,
		ResizeWidth:    20,
		ResizeHeight:   15,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if width != 20 || height != 15 {
		t.Fatalf("got dims (%d, %d), want (20, 15)", width, height)
	}
	bounds := result.Bounds()
	if bounds.Dx() != 20 || bounds.Dy() != 15 {
		t.Fatalf("got result bounds %v, want 20x15", bounds)
	}
}

func TestResizeExceedsPixelLimit(t *testing.T) {
	src := image.NewRGBA(image.Rect(0, 0, 40, 30))
	_, _, _, err := Resize(src, CompressionOptions{
		MaintainAspect: false,
		ResizeWidth:    16384,
		ResizeHeight:   16384,
	})
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "100MP") {
		t.Fatalf("expected error containing %q, got %q", "100MP", err.Error())
	}
}
