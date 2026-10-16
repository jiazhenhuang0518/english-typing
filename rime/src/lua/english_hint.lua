-- 给中文候选词加英文注释：苹果 → apple
-- 数据在 english_hint.dict.yaml，部署时编译成 build/english_hint.reverse.bin，
-- 用 ReverseLookup 按整词精确查（内存映射，不占键盘内存，iOS 键盘扩展内存很紧）。
-- 词典里英文的空格存成 "_"，因为 Rime 词典编码里空格是音节分隔符。

local M = {}

local function annotate(db, cand)
  local code = db:lookup(cand.text)
  if not code or code == "" then return cand end
  local eng = code:match("^%S+"):gsub("_", " ")
  local comment = cand.comment
  comment = (comment and comment ~= "") and (comment .. " " .. eng) or eng
  return ShadowCandidate(cand, cand.type, cand.text, comment)
end

function M.init(env)
  local ok, db = pcall(ReverseLookup, "english_hint")
  env.db = ok and db or nil
end

function M.func(input, env)
  local on = env.db and env.engine.context:get_option("english_hint")
  for cand in input:iter() do
    yield(on and annotate(env.db, cand) or cand)
  end
end

return M
