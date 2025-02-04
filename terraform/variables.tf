variable "db_password" {
  description = "Password for the database"
  type        = string
  sensitive   = true
}
variable "db_user_name" {
  description = "User for the database"
  type        = string
  default     = "tech4devops"
}
variable "ami_id" {
  description = "AMI ID for the EC2 instance"
  type        = string
  default     = "ami-04b4f1a9cf54c11d0"

}
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}
variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "core-banking"
}

variable "environment" {
  description = "Environment for the application"
  type        = string
  default     = "dev"
}
variable "vm_count" {
  description = "Number of EC2 instances to create"
  type        = number
  default     = 3

}
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "aws_profile" {
  description = "AWS profile to use"
  type        = string
  default     = "default"
}

variable "db_engine" {
  description = "Name of the database"
  type        = string
  default     = "postgres"
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "corebankingdb"
}
variable "domain_name" {
  description = "Domain name for the Route 53 zone"
  type        = string
  default     = "corebank.com"

}

variable "my_ip" {
  description = "Domain name for the Route 53 zone"
  type        = string
  default     = "0.0.0.0/0"
}
