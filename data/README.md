# data

`gfwlist.txt` is a snapshot from:

```text
https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt
```

The file is used by `scripts/filter-blocked.js` to filter candidate service domains into high-confidence blocked rule sets.

Update workflow:

```bash
curl -L https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt -o data/gfwlist.txt
npm run filter:blocked
npm run lint
npm run build
```

