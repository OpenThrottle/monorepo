# Caddy reverse proxy for E2 (api + developer). TLS via Caddy auto-HTTPS when DNS points here.
${api_domain} {
	reverse_proxy openthrottle-server:3000
}

${developer_domain} {
	reverse_proxy openthrottle-developer:3000
}
%{ if mcp_domain != "" }
# Publicly-exposed MCP transport. Only rendered when mcp_domain is set, which
# also renders OT_MCP_PUBLIC_URL into .env and so switches the MCP into OAuth
# public mode: every request needs a bearer issued by openthrottle-server's
# authorization server (docs/openthrottle/mcp-oauth-design.md). The default is
# still no public route at all.
${mcp_domain} {
	reverse_proxy mcp:3000
}
%{ endif }
