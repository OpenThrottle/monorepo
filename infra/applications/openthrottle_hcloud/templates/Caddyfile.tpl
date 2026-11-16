# Caddy reverse proxy (api + developer, optionally mcp). TLS via Caddy
# auto-HTTPS once DNS points at this box.
#
# Diverges from applications/openthrottle_gcp/templates/Caddyfile.tpl by exactly one
# thing: the optional mcp route. The api/developer mapping is identical, because
# the compose service names and the container port (3000) are the same on both
# provider paths — which is itself worth preserving, since it means TLS/DNS is a
# single row in infra/provider-contract.md rather than two.
#
# ⚠️ Caddy needs port 80 reachable to answer the ACME HTTP-01 challenge BEFORE
# it can serve 443. If the firewall or DNS is wrong, certificate issuance fails
# quietly and the site serves nothing on 443.
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
