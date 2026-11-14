package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"syscall/js"
	"time"

	_ "golang.org/x/image/bmp"
	_ "golang.org/x/image/webp"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
)

type Entry struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Size     int64  `json:"size"`
	Modified int64  `json:"modified"`
}

type listResult struct {
	Path    string  `json:"path"`
	Parent  *string `json:"parent"`
	Entries []Entry `json:"entries"`
}

var httpClient = &http.Client{Timeout: 60 * time.Second}

func siteOrigin() string {
	location := js.Global().Get("location")
	if location.IsUndefined() {
		return ""
	}
	return location.Get("origin").String()
}

func apiURL(path string, query url.Values) string {
	return siteOrigin() + path + "?" + query.Encode()
}

func filesURL(path string) url.Values {
	return url.Values{"path": []string{path}}
}

func rawURL(path string) string {
	return apiURL("/api/raw", filesURL(path))
}

func downloadURL(path string) string {
	values := filesURL(path)
	values.Set("download", "true")
	return apiURL("/api/raw", values)
}

func thumbURL(path string, width int) string {
	values := filesURL(path)
	values.Set("w", fmt.Sprint(width))
	return apiURL("/api/thumb", values)
}

func fetchList(path string) (listResult, error) {
	var result listResult
	err := fetchJSON(apiURL("/api/list", filesURL(path)), &result)
	return result, err
}

func fetchBytes(target string) ([]byte, error) {
	response, err := httpClient.Get(target)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, responseError(response)
	}
	return io.ReadAll(response.Body)
}

func fetchJSON(target string, value any) error {
	response, err := httpClient.Get(target)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return responseError(response)
	}
	return json.NewDecoder(response.Body).Decode(value)
}

func responseError(response *http.Response) error {
	data, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
	var body struct {
		Error string `json:"error"`
	}
	if json.Unmarshal(data, &body) == nil && body.Error != "" {
		return errors.New(body.Error)
	}
	return fmt.Errorf("HTTP %d", response.StatusCode)
}
