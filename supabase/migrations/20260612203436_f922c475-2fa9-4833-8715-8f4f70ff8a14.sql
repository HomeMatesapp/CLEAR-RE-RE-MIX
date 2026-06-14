REVOKE ALL ON FUNCTION public._merge_roles(uuid, uuid[], text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public._merge_roles(uuid, uuid[], text, text) TO service_role;