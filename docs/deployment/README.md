# Deployment

## Pre-Requisites

1. Install [terraform](https://developer.hashicorp.com/terraform/downloads).
1. Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install).
1. Create a [Google Cloud Project](https://cloud.google.com/resource-manager/docs/creating-managing-projects#creating_a_project).

## Bootstrap

1. Open a terminal.
1. Run `gcloud auth login && gcloud application-default login`.
1. `cd` into the [bootstrap](../infra/deployment/terraform/bootstrap) directory.
1. Create a [`terraform.tfvars`](https://developer.hashicorp.com/terraform/language/values/variables#variable-definitions-tfvars-files) file and fill out the variables' values. Leave the following variables empty for now:
   - `sourcerepo_name`
1. Comment out the entire contents of the `backend.tf` file.
1. Run `terraform init`.
1. Run `terraform apply -target=module.project`.
1. Uncomment the contents of the `backend.tf` file and add set the `bucket` attribute as the value of the `tfstate_bucket` output.
1. Run `terraform init` and type `yes`.
1. Create a [Cloud Source Repository](https://cloud.google.com/source-repositories/docs/creating-an-empty-repository#create_a_new_repository). Update the value of the `sourcerepo_name` variable in the `terraform.tfvars` file.
1. Run `terraform apply`.

## Apps Deployment

1. Deploy the Apps by either:
   - Pushing code to the respective `branch_name`.
   - Manually running the `apps` Cloud Build Trigger.
