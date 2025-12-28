FROM golang:1.24-bookworm as builder

WORKDIR /app

RUN apt-get update && apt-get install -y libvips-dev
RUN go install github.com/evanw/esbuild/cmd/esbuild@latest

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

RUN esbuild index.jsx --bundle --minify --outfile=assets/bundle.js --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment
RUN CGO_ENABLED=1 go build -v -o ./riffle .

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y libvips exiftool && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/riffle /riffle

VOLUME /import
VOLUME /library

ENV IMPORT_PATH=/import
ENV LIBRARY_PATH=/library

CMD ["/riffle"]
