# VPC and Networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.app_name}-vpc"
  }
}

# Application Load Balancer
resource "aws_lb" "app" {
  name               = "${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}



# RDS Instance
resource "aws_db_instance" "main" {
  identifier        = "${var.app_name}-db"
  engine            = var.db_engine
  engine_version    = "14.13"
  instance_class    = "db.t3.micro"
  allocated_storage = 20

  db_name  = var.db_name
  username = var.db_user_name
  password = var.db_password

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  backup_retention_period = 7
  skip_final_snapshot     = true
}

# Create Internet Gateway
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
}

# Update Route Table to route traffic to the IGW
resource "aws_route" "internet_access" {
  route_table_id         = aws_vpc.main.main_route_table_id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.gw.id
}

# Correct Parameter Group
resource "aws_elasticache_parameter_group" "redis7" {
  name        = "${var.app_name}-redis7"
  family      = "redis7" # Ensure this matches the Redis version
  description = "Parameter group for Redis 7"
}
# ElastiCache
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.app_name}-cache"
  engine               = "memcached"
  node_type            = "cache.t4g.micro"
  engine_version       = "1.6.22" # ✅ Add this line
  num_cache_nodes      = 1        # ✅ Required for clusters (set 1 if not a cluster)
  parameter_group_name = "default.memcached1.6"
  port                 = 11211
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.cache.id]
}

# Route 53
resource "aws_route53_zone" "main" {
  name = var.domain_name
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
