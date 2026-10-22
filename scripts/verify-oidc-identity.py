"""Print only repository identity claims, never the JWT or request credentials."""
import base64
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    request = Request(os.environ['ACTIONS_ID_TOKEN_REQUEST_URL'], headers={
        'Authorization': 'Bearer ' + os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN'],
    })
    with urlopen(request, timeout=30) as response:
        token = json.load(response)['value']
    payload = token.split('.')[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
    for key in ('repository', 'repository_id', 'ref', 'environment', 'sub'):
        print(key + ': ' + str(claims.get(key, '<absent>')))
except (HTTPError, URLError, KeyError, ValueError, IndexError):
    print('Unable to read OIDC identity claims. No credentials logged.', file=sys.stderr)
    sys.exit(1)
