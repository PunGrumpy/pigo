package core

import "errors"

var (
	ErrFileTooLarge = errors.New("file exceeds the maximum size")
)
