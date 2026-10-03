import re

# DB input parameters mapping to friendly user names
DB_TO_FRIENDLY_INPUTS = {
    "IBC_PENSION": "[IBC Pensión]",
    "IBC_SALUD": "[IBC Salud]",
    "IBC_ARL": "[IBC ARL]",
    "IBC_CCF": "[IBC Caja]",
    "DIAS_AFP": "[Días AFP]",
    "DIAS_EPS": "[Días EPS]",
    "DIAS_ARL": "[Días ARL]",
    "DIAS_CCF": "[Días Caja]",
    "SALARIO_BASICO": "[Salario Básico]",
    "TARIFA_ARL": "[Tarifa ARL]",
    "ING": "[Ingreso]",
    "RET": "[Retiro]",
    "EXONERADO": "[Exonerado]",
    "AUX_TRANSPORTE_DIARIO": "[Auxilio Transporte Diario]"
}

FRIENDLY_TO_DB_INPUTS = {
    "IBC PENSIÓN": "IBC_PENSION",
    "IBC PENSION": "IBC_PENSION",
    "IBC SALUD": "IBC_SALUD",
    "IBC ARL": "IBC_ARL",
    "IBC CAJA": "IBC_CCF",
    "DÍAS AFP": "DIAS_AFP",
    "DIAS AFP": "DIAS_AFP",
    "DÍAS EPS": "DIAS_EPS",
    "DIAS EPS": "DIAS_EPS",
    "DÍAS ARL": "DIAS_ARL",
    "DIAS ARL": "DIAS_ARL",
    "DÍAS CAJA": "DIAS_CCF",
    "DIAS CAJA": "DIAS_CCF",
    "SALARIO BÁSICO": "SALARIO_BASICO",
    "SALARIO BASICO": "SALARIO_BASICO",
    "TARIFA ARL": "TARIFA_ARL",
    "INGRESO": "ING",
    "RETIRO": "RET",
    "EXONERADO": "EXONERADO",
    "AUXILIO TRANSPORTE DIARIO": "AUX_TRANSPORTE_DIARIO",
    "AUXILIO DE TRANSPORTE DIARIO": "AUX_TRANSPORTE_DIARIO"
}

def get_rule_cell(orden: int, codigo: str, mapeos: list) -> str:
    m_match = None
    for m in mapeos:
        if m.codigo_calculo == codigo:
            # Prefer debit positions for formulas that have both (like rule 7)
            if m.formato == "debito":
                m_match = m
                break
            elif m_match is None:
                m_match = m
                
    if m_match:
        col = "V" if m_match.formato == "debito" else "W"
        row = m_match.posicion + 1
        return f"{col}{row}"
        
    # Fallbacks for calculated rules not present in MapeoPlantilla
    if orden == 8:
        return "V9"
    if orden == 11:
        return "V13"
        
    return f"V{orden + 1}"

def db_to_user(expr: str, formulas: list, mapeos: list) -> str:
    """
    Translates Python/DB syntax:
      'ROUNDDOWN([1] * 0.40, -3)'  ➔ 'REDONDEAR.MENOS(V2 * 0.40; -3)'
      '0 if EXONERADO else IBC_SALUD * 0.085' ➔ 'SI([Exonerado]; 0; [IBC Salud] * 0.085)'
    """
    # 1. Map rule index [ord_num] to Excel cell coordinate (V2, W5)
    ord_to_cell = {}
    for f in formulas:
        ord_to_cell[f.orden] = get_rule_cell(f.orden, f.codigo, mapeos)
        
    def repl_order(match):
        ord_num = int(match.group(1))
        return ord_to_cell.get(ord_num, f"V{ord_num + 1}")
        
    expr = re.sub(r"\[(\d+)\]", repl_order, expr)
    
    # 2. Replace DB input variables with friendly bracketed names (e.g. EXONERADO -> [Exonerado])
    for db_name, friendly in DB_TO_FRIENDLY_INPUTS.items():
        expr = re.sub(r"\b" + db_name + r"\b", friendly, expr)
        
    # 3. Translate Python ternary A if B else C -> SI(B; A; C)
    match_ternary = re.search(r"(.+?)\s+if\s+(.+?)\s+else\s+(.+)", expr)
    if match_ternary:
        a, b, c = match_ternary.group(1).strip(), match_ternary.group(2).strip(), match_ternary.group(3).strip()
        expr = f"SI({b}; {a}; {c})"
        
    # 4. Translate English functions to Spanish Excel names
    expr = expr.replace("ROUNDDOWN", "REDONDEAR.MENOS")
    expr = expr.replace("ROUNDUP", "REDONDEAR.MAS")
    expr = expr.replace("ROUND", "REDONDEAR")
    
    # 5. Swap parameter comma with semicolon
    expr = expr.replace(",", ";")
    
    return expr

def user_to_db(expr: str, formulas: list, mapeos: list) -> str:
    """
    Translates Spanish Excel syntax back to secure DB/Python syntax:
      'REDONDEAR.MENOS(V2 * 40%; -3)' ➔ 'ROUNDDOWN([1] * (40/100), -3)'
      'SI([Exonerado]; 0; [IBC Salud] * 8.5%)' ➔ '(0) if (EXONERADO) else ([IBC Salud] * (8.5/100))'
    """
    expr = expr.upper().strip()
    
    # Remove leading '=' if user typed it (e.g. =V2*12%)
    if expr.startswith("="):
        expr = expr[1:].strip()
        
    # 1. Translate percentages: 40% -> (40/100), 8.5% -> (8.5/100)
    expr = re.sub(r"(\d+(?:\.\d+)?)%", r"(\1/100)", expr)
    
    # 2. Translate SI(B; A; C) -> (A) if (B) else (C) handling nested parentheses
    def repl_si(match):
        inner = match.group(1)
        parts = []
        current = []
        depth = 0
        for char in inner:
            if char == ';' and depth == 0:
                parts.append("".join(current).strip())
                current = []
            else:
                if char == '(':
                    depth += 1
                elif char == ')':
                    depth -= 1
                current.append(char)
        parts.append("".join(current).strip())
        
        if len(parts) == 3:
            cond, true_val, false_val = parts[0], parts[1], parts[2]
            return f"({true_val}) if ({cond}) else ({false_val})"
        return match.group(0)
        
    expr = re.sub(r"\bSI\s*\((.+?)\)", repl_si, expr)
    
    # 3. Translate Spanish function names back to English simpleeval functions
    expr = expr.replace("REDONDEAR.MENOS", "ROUNDDOWN")
    expr = expr.replace("REDONDEAR.MAS", "ROUNDUP")
    expr = expr.replace("REDONDEAR", "ROUND")
    
    # 4. Swap parameter semicolon with comma
    expr = expr.replace(";", ",")
    
    # 5. Map all possible cell coordinates (V and W) to their rule index
    cell_to_orden = {}
    for f in formulas:
        cell = get_rule_cell(f.orden, f.codigo, mapeos)
        cell_to_orden[cell] = f.orden
        
    for f in formulas:
        for m in mapeos:
            if m.codigo_calculo == f.codigo:
                col = "V" if m.formato == "debito" else "W"
                row = m.posicion + 1
                cell_to_orden[f"{col}{row}"] = f.orden

    # 6. Replace friendly bracketed inputs
    def repl_friendly(match):
        term = match.group(1).strip()
        if term in FRIENDLY_TO_DB_INPUTS:
            return FRIENDLY_TO_DB_INPUTS[term]
        raise ValueError(f"El término '{match.group(0)}' no es un campo contable de entrada válido.")
        
    expr = re.sub(r"\[([^\]]+)\]", repl_friendly, expr)
    
    # 7. Replace cell coordinates (V2, W5) with DB indexes [ord_num]
    def repl_cell(match):
        cell = match.group(1)
        if cell in cell_to_orden:
            ord_num = cell_to_orden[cell]
            return f"[{ord_num}]"
        raise ValueError(f"La celda '{cell}' no corresponde a una fila contable o celda válida.")
        
    expr = re.sub(r"\b([A-Z]{1,2}\d+)\b", repl_cell, expr)
    
    return expr
