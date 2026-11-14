package main

import (
	"log"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
)

func main() {
	application := newApp()

	mygo.App.WhenReady(func() {
		application.win = mygo.NewWindow(mygo.WindowOptions{
			Title:   "finkyo",
			Width:   1100,
			Height:  720,
			Content: ui.View(application.view),
		})
	})

	if err := mygo.App.Run(); err != nil {
		log.Fatal(err)
	}
}
