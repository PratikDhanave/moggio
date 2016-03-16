package youtube

import (
	"log"
	"testing"
)

func TestYoutube(t *testing.T) {
	p, err := New([]string{"https://www.youtube.com/watch?v=wZNYDzNGB-Q"}, nil)
	if err != nil {
		log.Fatal(err)
	}
	_ = p
}
