build:
	go build -o riffle
	esbuild index.jsx --bundle --outfile=assets/bundle.js --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment

dev:
	go run main.go & esbuild index.jsx --bundle --outfile=assets/bundle.js --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --watch

watch:
	DEV_MODE=true air --build.cmd 'go build -o ./tmp/main .' & esbuild index.jsx --bundle --outfile=assets/bundle.js --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --watch