package core

const (
	MaxFileSize  = 20 << 20 // 20 MB
	MaxPixels    = 100_000_000
	MaxDimension = 16_384

	// MaxUpscaleFactor bounds output pixels relative to source pixels so a
	// tiny upload cannot demand a huge render.
	MaxUpscaleFactor = 16
)

type CompressionOptions struct {
	OutputFormat   string
	Quality        int
	ResizeWidth    int
	ResizeHeight   int
	MaintainAspect bool
}
