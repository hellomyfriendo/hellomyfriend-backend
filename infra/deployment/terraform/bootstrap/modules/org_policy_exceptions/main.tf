locals {
  org_policy_name_prefix = "projects/${data.google_project.project.number}/policies"

  org_policy_parent = "projects/${data.google_project.project.number}"
}

data "google_project" "project" {
}

resource "google_org_policy_policy" "compute_requireVpcFlowLogs" {
  name   = "${local.org_policy_name_prefix}/compute.requireVpcFlowLogs"
  parent = local.org_policy_parent

  spec {
    reset = true
  }
}

resource "google_org_policy_policy" "iam_disableServiceAccountKeyCreation" {
  name   = "${local.org_policy_name_prefix}/iam.disableServiceAccountKeyCreation"
  parent = local.org_policy_parent

  spec {
    reset = true
  }
}

resource "google_org_policy_policy" "run_allowedIngress" {
  name   = "${local.org_policy_name_prefix}/run.allowedIngress"
  parent = local.org_policy_parent

  spec {
    reset = true
  }
}