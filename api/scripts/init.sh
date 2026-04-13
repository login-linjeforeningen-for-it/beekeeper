#!/bin/sh

# For all INSERT statements updating is the desired approach, not "NOTHING", but
# to keep the init and update logic separated it is skipped here and performed
# by the update script within a minute. Adding update logic here would make the
# script about 50 lines longer (the logic can be found in update.sh if desired).

echo "🐝 Initiating BeeKeeper."

export PGPASSWORD=$DB_PASSWORD
export DOCTL_ACCESS_TOKEN=$DOCTL_TOKEN

PSQL="psql -h $DB_HOST -U $DB_USER -d $DB -t -c"

doctl auth init --access-token "$DOCTL_ACCESS_TOKEN"

doctl kubernetes cluster kubeconfig save c99a6c23-9137-4d39-895d-108c03cf313a
doctl kubernetes cluster kubeconfig save 0867601a-4f29-44c7-bbc3-2981b2c99239

kubectl config get-contexts | sed 's/^\*//' | tail -n +2 | while read -r line; do
    name=$(echo $line | awk '{print $2}')
    cluster=$(echo $line | awk '{print $3}')
    authinfo=$(echo $line | awk '{print $4}')
    namespace=$(echo $line | awk '{print $5}')
    context_short_name=$(echo $name | sed 's/^do-ams3-//')
    $PSQL "INSERT INTO contexts (name, cluster, authinfo, namespace) VALUES ('$context_short_name', '$cluster', '$authinfo', '$namespace') ON CONFLICT DO NOTHING;"

    kubectl config use-context "$name"
    kubectl get ns | tail -n +2 | while read -r line; do
        namespace_name=$(echo $line | awk '{print $1}')
        namespace_status=$(echo $line | awk '{print $2}')
        age=$(echo $line | awk '{print $3}')
        $PSQL "INSERT INTO namespaces (context, name, status, service_status, age) VALUES ('$context_short_name', '$namespace_name', '$namespace_status', 'operational', '$age') ON CONFLICT DO NOTHING;"
    
        kubectl get pods -n $namespace_name | tail -n +2 | while read -r line; do
            pod_name=$(echo $line | awk '{print $1}')
            ready=$(echo $line | awk '{print $2}')
            status=$(echo $line | awk '{print $3}')
            restarts=$(echo $line | awk '{print $4}')
            pod_age=$(echo $line | awk '{print $5}')
            $PSQL "INSERT INTO pods (name, ready, status, restarts, age, context, namespace) VALUES ('$pod_name', '$ready', '$status', '$restarts', '$pod_age', '$context_short_name', '$namespace_name') ON CONFLICT DO NOTHING;"
        done

        kubectl get ingress -n $namespace_name | tail -n +2 | while read -r line; do
            ingress_name=$(echo $line | awk '{print $1}')
            class=$(echo $line | awk '{print $2}')
            hosts=$(echo $line | awk '{print $3}')
            address=$(echo $line | awk '{print $4}')
            ports=$(echo $line | awk '{print $5 $6}')
            age=$(echo $line | awk '{print $7}')
            $PSQL "INSERT INTO namespace_ingress (context, namespace, name, class, hosts, address, ports, age) VALUES ('$context_short_name', '$namespace_name', '$ingress_name', '$class', '$hosts', '$address', '$ports', '$age') ON CONFLICT DO NOTHING;"
            $PSQL "INSERT INTO namespace_domains (name, url, context, namespace) VALUES ('$ingress_name', '$hosts', '$context_short_name', '$namespace_name') ON CONFLICT DO NOTHING;"
        done

        for ingress in $(kubectl get ingress -n beehive -o name); do
            echo "🐝 Swarming $ingress"
            events=$(kubectl describe $ingress -n beehive | awk '/Events:/ {flag=1; next} /^$/ {flag=0} flag' | grep -v '<none>')
            if [ -n "$events" ]; then
                echo "🚩 Events found:"
                echo "$events"
                $PSQL "INSERT INTO namespace_ingress_events (context, namespace, name, events) VALUES ('$context_short_name', '$namespace_name', '$ingress', '$events') ON CONFLICT DO NOTHING;"
            else
                echo "🐝 No events"
            fi
            echo "--------------------------------------------------------------"
        done
    done
done

echo "🐝 Contexts, namespaces and pods added to BeeKeeper."

crond -b

echo "🐝 Started cron."
echo "🐝 BeeKeeper initiated."

bun src/index.ts
