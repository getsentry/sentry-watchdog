# GCP Cloud Functions

This Terraform module helps deploy and manage Google Cloud Functions.

Terraform definitions will be pulled from the `terraform.yaml` file under each function folder

## Usage
```yaml
name: example-gen2-cron
description: gen2 cloud function example
cloud-function-gen2:
  runtime: python311
  execution_timeout: 120
  available_memory: 256M
  environment_variables: 
    ENV_1: $project_id
    ENV_2: 345
  secrets:
    - key: test_key_1
      secret: test_key_1
      version: latest
cron:
  schedule: 0 * * * *
  time_zone: America/New_York
  attempt_deadline: 320s
  http_method: GET
```

## Inputs
Basic Info
| Name | Description | Type | Required | Default |
|------|-------------|------|----------|---------|
| name | Name of the Cloud Function | string | yes | - |
| description | Description of the Cloud Function | string | no | null |

### Cloud Function Gen2 (Required)
| Name | Description | Type | Required | Default |
|------|-------------|------|----------|---------|
| cloud-function-gen2 | Details about the Gen2 Cloud Function | map(string) | yes | - |
| runtime | Runtime for the function (e.g., python39, nodejs16, go116) | string | no | python311 |
| entry_point | Name of the function to be called | string | yes | - |
| available_memory | Memory allocated to the function (in MB) | string | no | 256M |
| execution_timeout | Function execution timeout, in seconds | number | no | 60 |
| environment_variables | Environment variables for the function | map(string) | no | {} |
| secrets | Secrets that will be exposed to the function as env var | list | no | null |
| function_entrypoint | The entry point of your Function | string | no | main |
| ingress_settings | Allow public ingress traffic or not | String | no | ALLOW_ALL |
| allow_unauthenticated | Allow unauthenticated webhook call or not | bool | no | false |

### Crons (Optional)
| Name | Description | Type | Required | Default |
|------|-------------|------|----------|---------|
| cron | Create a cron job for the cloud function | map(string) | no | - |
| description | Description of the cron job | string | no | description from `cloud-function-gen2` |
| schedule | Schedule of the cron job | string | yes | - |
| time_zone | Timezone of the schedule | string | no | Etc/UTC |
| attempt_deadline | Deadline for the function to return before job fail | string | no | 320s |
| http_method | HTTP method for the call to make | string | no | GET |


## How to Create a New Function

1. Create a new folder under `./functions/` with your function name as the folder name
2. Create the `terraform.yaml` file under your folder, provide required information base on the [Usage](#usage) and [Input](#input)
3. Create the code and any required files in your folder, e.g. `main.py` and `requirements.txt`
4. Create a ReadMe.md in your folder to provide context on your function


## Notes
- The source code directory (source_dir) should contain all necessary files for your function
- Make sure the entry_point matches the function name in your code
- The function will be deployed with the default service account
- Source code is automatically zipped and uploaded to GCS
- Supports Cloud Function 2nd generation
- For Environment Variables, you can reference variables in [.terraform.tfvars](../terraform.tfvars) by adding `$` prefix
  -  e.g. `$project_id` will be translated into `jeffreyhung-test`
  - Any environment variables that have `$` prefix but can't be found in `terraform.tfvars` will be treated as String with $ included.