data "aws_availability_zones" "available" {
  state = "available"
}

data "http" "myip" {
  url = "https://api.ipify.org"
}

locals {
  my_ip = coalesce("${data.http.myip.response_body}/32", var.my_ip)
}
