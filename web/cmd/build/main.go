// Command build compiles the mygo UI to WebAssembly and assembles web/dist,
// which the Rust binary embeds.
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "build failed:", err)
		os.Exit(1)
	}
}

func run() error {
	root, err := os.Getwd()
	if err != nil {
		return err
	}
	if _, err := os.Stat(filepath.Join(root, "go.mod")); err != nil {
		return fmt.Errorf("run this from the web directory")
	}

	dist := filepath.Join(root, "dist")
	if err := os.RemoveAll(dist); err != nil {
		return err
	}
	if err := os.MkdirAll(dist, 0o755); err != nil {
		return err
	}

	wasm := filepath.Join(dist, "app.wasm")
	command := exec.Command(
		"go", "build",
		"-trimpath",
		"-tags", "mygo_noinspector",
		"-ldflags=-s -w",
		"-o", wasm,
		".",
	)
	command.Dir = root
	command.Env = append(os.Environ(), "GOOS=js", "GOARCH=wasm")
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	if err := command.Run(); err != nil {
		return err
	}

	goroot, err := output("go", "env", "GOROOT")
	if err != nil {
		return err
	}
	wasmExec := filepath.Join(goroot, "lib", "wasm", "wasm_exec.js")
	if err := copyFile(wasmExec, filepath.Join(dist, "wasm_exec.js")); err != nil {
		return err
	}

	version, err := fileHash(wasm)
	if err != nil {
		return err
	}

	index, err := os.ReadFile(filepath.Join(root, "index.html"))
	if err != nil {
		return err
	}
	page := strings.ReplaceAll(string(index), "{{VERSION}}", version)
	if err := os.WriteFile(filepath.Join(dist, "index.html"), []byte(page), 0o644); err != nil {
		return err
	}

	info, err := os.Stat(wasm)
	if err != nil {
		return err
	}
	fmt.Printf("web/dist ready: app.wasm %.1f MB, version %s\n", float64(info.Size())/(1024*1024), version)
	return nil
}

func output(name string, args ...string) (string, error) {
	data, err := exec.Command(name, args...).Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(data)), nil
}

func fileHash(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()
	sum := sha256.New()
	if _, err := io.Copy(sum, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(sum.Sum(nil))[:12], nil
}

func copyFile(source, destination string) error {
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()

	output, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer output.Close()

	_, err = io.Copy(output, input)
	return err
}
