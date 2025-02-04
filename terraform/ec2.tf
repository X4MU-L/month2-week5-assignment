# EC2 Instances
resource "aws_instance" "app" {
  count                       = var.vm_count
  ami                         = var.ami_id
  instance_type               = "t2.micro"
  key_name                    = aws_key_pair.main.key_name
  subnet_id                   = aws_subnet.private[count.index % 3].id
  vpc_security_group_ids      = [aws_security_group.app.id]
  associate_public_ip_address = true

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.app_name}-server-${count.index + 1}"
    App  = var.app_name
  }
}
