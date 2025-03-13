# Work in progress

# Sentry Cookie Scanner
Sentry took a stand of removing all 3rd party cookeis and trackers from our public websites in 2024.
- [We removed advertising cookies and here’s what happened - Matt Henderson](https://blog.sentry.io/we-removed-advertising-cookies-heres-what-happened/)
- [Navigating Cookies at Sentry: A Legal Perspective - Loretta Lau](https://blog.sentry.io/navigating-cookies-at-sentry-a-legal-perspective/)
- [Removing ad trackers and cookies - the technical perspective - Jeffrey Hung](https://blog.sentry.io/removing-ad-trackers-and-cookies-the-technical-perspective/)
- [Sentry Cookie Bounty](https://sentry.io/cookiebounty/)

This repository is a tool that we use to helps Sentry look for cookies on our public sites. It's forked and built on top of [blacklight-collector from the Markup](https://github.com/the-markup/blacklight-collector/tree/main?tab=readme-ov-file). For more information about the `blacklight-collector` please read their [methodology](https://themarkup.org/blacklight/2020/09/22/how-we-built-a-real-time-privacy-inspector).

If you are interested in running it locally you can clone this repository and follow the instructions below.

## Build

Update `terraform.tfvars` with your configs, make sure you are auth to GCP, then run

```
terraform init
terraform plan
terraform apply
```
to deploy the infrastructure and all the cloud functions.

## Usage

Update `scanner_config.yaml` on the root folder according to your need, including the `target_list` which is a yaml defined list of sitemaps or rss feeds of pages to scan, and the `output` values to define where the reports will be stored.

`npm run scan` to perform the scan on the targets defined in `scanner_config.yaml`

`npm run aggregate` to aggregate the existing reports in `reportDir` and provide an aggregated list of cookies and trackers.

