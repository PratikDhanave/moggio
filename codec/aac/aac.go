// +build cgo

package aac

import (
	"io"

	"github.com/dhowden/tag"
	aac "github.com/nareix/codec"
	"github.com/mjibson/moggio/codec"
)

func init() {
	codec.RegisterCodec("AAC", []string{"\u00ff\u00f1", "\u00ff\u00f9"}, []string{"aac"}, NewSongs, nil)
}

func NewSongs(rf codec.Reader) (codec.Songs, error) {
	s, err := NewSong(rf)
	if err != nil {
		return nil, err
	}
	return codec.Songs{codec.None: s}, nil
}

func NewSong(rf codec.Reader) (codec.Song, error) {
	f := &AAC{
		Reader: rf,
	}
	return f, nil
}

type AAC struct {
	Reader  codec.Reader
	r       io.ReadCloser
	a       *aac.AACDecoder
	samples []float32
}

func (v *AAC) Init() (sampleRate, channels int, err error) {
	if v.v == nil {
		r, _, err := v.Reader()
		if err != nil {
			return 0, 0, err
		}
		vr, err := vorbis.New(r)
		if err != nil {
			r.Close()
			return 0, 0, err
		}
		v.r = r
		v.v = vr
	}
	return v.v.SampleRate, v.v.Channels, nil
}

func (v *AAC) Info() (info codec.SongInfo, err error) {
	return
}

func (v *AAC) Play(n int) ([]float32, error) {
	var err error
	var data []float32
	for len(v.samples) < n && err == nil {
		data, err = v.v.Decode()
		if err != nil {
			break
		}
		v.samples = append(v.samples, data...)
	}
	if n > len(v.samples) {
		n = len(v.samples)
	}
	ret := v.samples[:n]
	v.samples = v.samples[n:]
	return ret, err
}

func (v *AAC) Close() {
	if v.r != nil {
		v.r.Close()
	}
}
