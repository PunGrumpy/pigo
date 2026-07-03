package core

const (
	MaxFileSize  = 20 << 20 // 20 MB
	MaxPixels    = 100_000_000
	MaxDimension = 16_384
)

type CompressionOptions struct {
	OutputFormat   string
	Quality        int
	ResizeWidth    int
	ResizeHeight   int
	MaintainAspect bool
}
