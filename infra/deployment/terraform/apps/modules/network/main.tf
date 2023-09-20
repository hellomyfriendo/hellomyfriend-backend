data "google_project" "project" {
}

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

# TODO(Marcus): Raise these values when I can pay for it.
resource "google_vpc_access_connector" "connector" {
  name           = "na-ne-1-vpc-conn-1"
  machine_type   = "f1-micro"
  min_instances  = 2
  max_instances  = 3
  max_throughput = 300
  subnet {
    name = module.vpc.subnets["northamerica-northeast1/na-ne-1-vpc-access-conn-1"].name
  }
}