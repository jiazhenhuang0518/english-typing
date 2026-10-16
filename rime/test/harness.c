// 用 librime 模拟打字：harness <rime用户目录> <拼音>...
// 每个拼音打印前 5 个候选和注释。编译见 rime/test/run.sh
#include <stdio.h>
#include <string.h>
#include <rime_api.h>

int main(int argc, char **argv) {
  if (argc < 3) {
    fprintf(stderr, "usage: %s USER_DIR PINYIN...\n", argv[0]);
    return 2;
  }
  RimeApi *rime = rime_get_api();
  RIME_STRUCT(RimeTraits, traits);
  traits.shared_data_dir = argv[1];
  traits.user_data_dir = argv[1];
  traits.distribution_name = "harness";
  traits.distribution_code_name = "harness";
  traits.distribution_version = "1";
  traits.app_name = "rime.harness";
  traits.min_log_level = 2;
  rime->setup(&traits);
  rime->initialize(&traits);
  RimeSessionId s = rime->create_session();
  if (!rime->select_schema(s, "rime_ice")) {
    fprintf(stderr, "select_schema failed\n");
    return 1;
  }
  for (int i = 2; i < argc; i++) {
    const char *arg = argv[i];
    if (strcmp(arg, "--toggle") == 0) {
      Bool on = rime->get_option(s, "english_hint");
      rime->set_option(s, "english_hint", !on);
      printf("[english_hint -> %d]\n", !on);
      continue;
    }
    rime->clear_composition(s);
    rime->simulate_key_sequence(s, arg);
    RIME_STRUCT(RimeContext, ctx);
    printf("%s:", arg);
    if (rime->get_context(s, &ctx)) {
      int n = ctx.menu.num_candidates < 5 ? ctx.menu.num_candidates : 5;
      for (int k = 0; k < n; k++) {
        RimeCandidate *c = &ctx.menu.candidates[k];
        printf("  %s", c->text);
        if (c->comment && *c->comment) printf("〔%s〕", c->comment);
      }
      rime->free_context(&ctx);
    }
    printf("\n");
  }
  rime->destroy_session(s);
  rime->finalize();
  return 0;
}
