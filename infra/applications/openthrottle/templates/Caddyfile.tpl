# Caddy reverse proxy for E2 (api + developer). TLS via Caddy auto-HTTPS when DNS points here.
${api_domain} {
	reverse_proxy openthrottle-server:3000
}

${developer_domain} {
	reverse_proxy openthrottle-developer:3000
}
