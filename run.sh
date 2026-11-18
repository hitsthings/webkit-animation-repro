#!/bin/bash
# Run a command inside the container that has WebKit's runtime deps; HOME is the host's so the Playwright cache resolves.
exec docker run --rm --network host -e HOME=$HOME -v $HOME:$HOME -w "$PWD" wkimg "$@"
