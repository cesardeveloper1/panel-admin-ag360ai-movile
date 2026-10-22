"""Check federated Play access with a temporary, uncommitted edit. No uploads."""
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.agiliza360.mobile/edits'


def request(method, url, body=None):
    headers = {'Authorization': 'Bearer ' + os.environ['GOOGLE_OAUTH_ACCESS_TOKEN']}
    data = None
    if body is not None:
        headers['Content-Type'] = 'application/json'
        data = json.dumps(body).encode()
    with urlopen(Request(url, data=data, headers=headers, method=method), timeout=30) as response:
        payload = response.read()
        return json.loads(payload) if payload else None


def main():
    edit = request('POST', BASE, {})['id']
    try:
        request('GET', BASE + '/' + edit + '/details')
        tracks = request('GET', BASE + '/' + edit + '/tracks')
        print('GitHub OIDC and Google Play app access verified.')
        print('Tracks readable:', len(tracks.get('tracks', [])))
        print('No AAB built, uploaded, or published; temporary edit discarded.')
    finally:
        request('DELETE', BASE + '/' + edit)


if __name__ == '__main__':
    try:
        main()
    except HTTPError as error:
        print('Google Play access check failed: HTTP ' + str(error.code), file=sys.stderr)
        sys.exit(1)
    except (URLError, KeyError, ValueError):
        print('Google Play access check failed; no credentials were logged.', file=sys.stderr)
        sys.exit(1)
