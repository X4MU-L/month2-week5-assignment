#!/bin/bash

# Get absolute paths
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
export ANSIBLE_CONFIG="$SCRIPT_DIR/ansible/ansible.cfg"
export ANSIBLE_PRIVATE_KEY_FILE="$SCRIPT_DIR/terraform/core-banking-key.pem"

# Terraform operations
cd "$SCRIPT_DIR/terraform" || exit 1
terraform init
terraform validate
terraform plan -out=plan.out

if ! terraform apply -auto-approve plan.out; then
    echo "❌ Terraform apply failed. Exiting."
    exit 1
fi
echo "✅ Terraform infrastructure applied successfully."

# Run Ansible ping with explicit configuration
echo "Running connectivity test..."
ansible -i "$SCRIPT_DIR/ansible/inventory_aws_ec2.yml" \
    all \
    -m ping \
    -u ubuntu \
    --private-key="$ANSIBLE_PRIVATE_KEY_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Ansible ping failed. Exiting."
    exit 1
fi
echo "✅ Ansible connectivity check passed."
# First, verify the SSH key exists and has correct permissions
if [ ! -f "$ANSIBLE_PRIVATE_KEY_FILE" ]; then
    echo "❌ SSH key not found at $ANSIBLE_PRIVATE_KEY_FILE"
    exit 1
fi
chmod 600 "$ANSIBLE_PRIVATE_KEY_FILE"

# Run Ansible playbook
cd "$SCRIPT_DIR" || exit 1
ansible-playbook \
    -i "./ansible/inventory_aws_ec2.yml" \
    "./ansible/playbook.yml" \
    --extra-vars "$(terraform -chdir=./terraform output -json)" \
    -u ubuntu \
    --private-key="$ANSIBLE_PRIVATE_KEY_FILE"
