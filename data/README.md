# data

`gfwlist.txt` is a snapshot from:

```text
https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt
```

The file is used by `scripts/generate-rules.js` as auxiliary evidence when generating reports. It no longer decides whether a candidate rule is included.

`manual-include.list` contains user-confirmed rules and acceleration preferences. These entries are reported as `manual-include` in `reports/*.report.txt`.

Update workflow:

```bash
curl -L https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt -o data/gfwlist.txt
npm run generate:rules
npm run lint
npm run build
```
