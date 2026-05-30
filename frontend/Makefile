.PHONY: build image run clean

IMAGE_NAME = social-justice-frontend
PORT = 3000

build: image

image:
	docker build -t $(IMAGE_NAME) .

run:
	docker run -p $(PORT):$(PORT) --name $(IMAGE_NAME)-container --rm $(IMAGE_NAME)

clean:
	docker rmi $(IMAGE_NAME)
