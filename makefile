build:
	go build -o riffle

dev:
	go run main.go

watch:
	air --build.cmd 'go build -o ./tmp/main .'
