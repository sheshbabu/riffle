build:
	esbuild index.jsx --bundle --outfile=assets/bundle.js --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment
	go build -o riffle

dev:
	esbuild index.jsx --bundle --outfile=assets/bundle.js --sourcemap --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment
	DEV_MODE=true go run main.go

watch:
	DEV_MODE=true air --build.cmd 'go build -o ./tmp/main .' & esbuild index.jsx --bundle --outfile=assets/bundle.js --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --watch