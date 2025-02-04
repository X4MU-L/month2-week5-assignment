
output "available_azs" {
  value = data.aws_availability_zones.available.names
}

output "private_subnet_cidrs" {
  value = aws_subnet.private[*].cidr_block
}

output "public_subnet_cidrs" {
  value = aws_subnet.public[*].cidr_block
}

output "debug_security_groups" {
  value = {
    db_sg_id    = aws_security_group.db.id
    app_sg_id   = aws_security_group.app.id
    cache_sg_id = aws_security_group.cache.id
  }
}

output "app_instance_ips" {
  value = aws_instance.app[*].public_ip
}

output "elasticache_endpoint" {
  value = aws_elasticache_cluster.main.cache_nodes[0].address
}
output "elasticache_port" {
  value = aws_elasticache_cluster.main.cache_nodes[0].port
}

output "detected_ip" {
  description = "Detected IP address from API"
  value       = data.http.myip.response_body
}

output "used_ip" {
  description = "IP address being used (from env var or API)"
  value       = local.my_ip
}

output "env_ip" {
  description = "IP from environment variable (if set)"
  value       = var.my_ip
}
