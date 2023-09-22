# TODO(Marcus): See about using CMEK with VPCs
module "vpc" {
  source  = "terraform-google-modules/network/google"
  version = "~> 7.3"

  project_id   = data.google_project.project.project_id
  network_name = "vpc-network"
  routing_mode = "GLOBAL"

  subnets = [
    {
      subnet_name           = "na-ne-1-vpc-access-conn-1"
      subnet_ip             = "10.129.0.0/28"
      subnet_region         = "northamerica-northeast1"
      subnet_private_access = "true"
      # TODO(Marcus): Enable this when I can pay for it.
      # subnet_flow_logs          = true
      # subnet_flow_logs_sampling = "1.0"
    }
  ]
}