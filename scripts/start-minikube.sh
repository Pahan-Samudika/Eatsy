# Start Minikube with Docker driver
minikube start --driver=docker

# Wait for Minikube to be ready
echo "Waiting for Minikube to be ready..."
minikube status

# Enable the Ingress addon
minikube addons enable ingress

# Apply Kubernetes configurations
kubectl apply -f c:\Users\TUF\Desktop\Uni Projects\Eatsy-Clone\Project\Eatsy\k8s\

# Get Minikube IP
echo "Minikube IP: $(minikube ip)"

# Instructions for hosts file
echo "Add the following line to your hosts file (C:\Windows\System32\drivers\etc\hosts):"
echo "$(minikube ip) eatsy.local"

# Check ingress status
kubectl get ingress
