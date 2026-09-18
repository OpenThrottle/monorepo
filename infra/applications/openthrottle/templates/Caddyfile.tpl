# Caddy reverse proxy for E2 (api + developer). TLS via Caddy auto-HTTPS when DNS points here.
${api_domain} {
	reverse_proxy openthrottle-server:3000
}

${developer_domain} {
	reverse_proxy openthrottle-developer:3000
}
%{ if mcp_domain != "" }
# Publicly-exposed MCP transport. Only rendered when mcp_domain is set; the
# default is no public route, because this endpoint is guarded solely by
# OPENTHROTTLE_MCP_AUTH_TOKEN.
${mcp_domain} {
	reverse_proxy mcp:3000
}
%{ endif }
