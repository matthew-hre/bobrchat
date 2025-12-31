{
  mkShell,
  alejandra,
  bash,
  nodejs,
  bun,
  docker-compose,
}:
mkShell rec {
  name = "sdk-test";

  packages = [
    bash
    nodejs
    bun

    docker-compose

    # Required for CI for format checking.
    alejandra
  ];
}
