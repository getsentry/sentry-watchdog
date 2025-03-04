# GCP Pub/Sub

This Terraform module helps deploy and manage Google Cloud Pub/Sub topics and subscriptions.

Terraform definitions will be pulled from the `terraform.yaml` file under each folders in `.pubsub`

## Usage
```yaml
name: example-pubsub
description: example pubsub topic and subscription
pubsub:
  topic_name: example-pubsub-topic
  subscription_id: example-pubsub-subscription
  service_account_id: example-pubsub-sa
  service_account_display_name: Example PubSub Service Account
  ttl: 7
sink:
  sink_name: example-pubsub-sink
```

## Inputs
Basic Info
| Name | Description | Type | Required | Default |
|------|-------------|------|----------|---------|
| name | Name of the Pub/Sub topic | string | yes | - |
| description | Description of the Pub/Sub setup | string | no | null |

### pubsub (Required)
| Name | Description | Type | Required | Default |
|------|-------------|------|----------|---------|
| pubsub | Details about the Pub/Sub topic | map(any) | yes | - |
| topic_name | Name of the PubSub topic | string | yes | - |
| subscription_id | How long to retain undelivered messages | string | yes | - |
| service_account_id | ID of the sevice account for the PubSub | string | yes | - |
| service_account_display_name | Display name of the sevice account for the PubSub | string | yes | - |
| ttl | PubSub topic Time to Live | string | no | null|

### sink (Optional)
| Name | Description | Type | Required | Default |
|------|-------------|------|----------|---------|
| name | Name of the subscription | string | yes | - |
| sink_name | Name of the sink | string | yes | - |

## How to Create a New Pub/Sub Setup

1. Create a new folder under `./pubsubs/` with your pubsub name as the folder name
2. Create the `terraform.yaml` file under your folder, provide required information based on the [Usage](#usage) and [Input](#inputs)
3. Create a ReadMe.md in your folder to provide context on your pub/sub setup
