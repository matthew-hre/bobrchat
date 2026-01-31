{
  mkShell,
  alejandra,
  bash,
  nodejs,
  bun,
  docker-compose,
  patchelf,
  glibc,
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

    patchelf
  ];

  shellHook = ''
    patch_workerd() {
      local workerd_bin="node_modules/@cloudflare/workerd-linux-64/bin/workerd"
      if [ -f "$workerd_bin" ]; then
        local current_interp=$(patchelf --print-interpreter "$workerd_bin" 2>/dev/null || echo "")
        local nix_interp="${glibc}/lib/ld-linux-x86-64.so.2"
        if [ "$current_interp" != "$nix_interp" ]; then
          echo "Patching workerd binary for NixOS compatibility..."
          patchelf --set-interpreter "$nix_interp" "$workerd_bin"
          echo "Done patching workerd."
        fi
      fi
    }
    patch_workerd
  '';
}
