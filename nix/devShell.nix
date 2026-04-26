{
  mkShell,
  alejandra,
  bash,
  nodejs,
  bun,
  docker-compose,
  wrangler,
}:
mkShell rec {
  name = "sdk-test";

  packages = [
    bash
    nodejs
    bun

    docker-compose

    # Cloudflare Workers CLI (properly linked for NixOS)
    wrangler

    # Required for CI for format checking.
    alejandra
  ];
}
