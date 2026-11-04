# Caddy reverse proxy (api + developer, optionally mcp). TLS via Caddy
# auto-HTTPS once DNS points at this box.
#
# Diverges from applications/openthrottle_gcp/templates/Caddyfile.tpl by two
# things: the optional mcp route, and the developer domain's /api route. The
# service names and the container port (3000) are the same on both provider
# paths — which is itself worth preserving, since it means TLS/DNS is a single
# row in infra/provider-contract.md rather than two.
#
# ⚠️ Caddy needs port 80 reachable to answer the ACME HTTP-01 challenge BEFORE
# it can serve 443. If the firewall or DNS is wrong, certificate issuance fails
# quietly and the site serves nothing on 443.
${api_domain} {
	reverse_proxy openthrottle-server:3000
}

# One origin for the browser (docs/monorepo/phone-access.md): the developer app
# calls the API at /api on its own domain, so /api/* goes to the server with the
# prefix stripped — graphql-ws upgrades included, which reverse_proxy passes
# through on its own. The api domain above stays for non-browser clients.
${developer_domain} {
	handle_path /api/* {
		reverse_proxy openthrottle-server:3000
	}

	handle {
		reverse_proxy openthrottle-developer:3000
	}
}
%{ if mcp_domain != "" }
# Publicly-exposed MCP transport. Only rendered when mcp_domain is set; the
# default is no public route at all, because this endpoint is guarded solely by
# OPENTHROTTLE_MCP_AUTH_TOKEN.
${mcp_domain} {
	reverse_proxy mcp:3000
}
%{ endif }
