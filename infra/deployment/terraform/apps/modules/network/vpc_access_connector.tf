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