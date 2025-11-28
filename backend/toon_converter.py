"""
TOON (Token Optimized Object Notation) Converter
Converts JSON to a CSV-like token-efficient format
"""

import json
import re
from typing import Any, Dict, List, Set


def json_to_toon(json_string: str) -> str:
    """Convert JSON string to TOON format"""
    try:
        obj = json.loads(json_string)
        return convert_to_toon(obj, '')
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {str(e)}")


def convert_to_toon(obj: Any, prefix: str = '') -> str:
    """Recursively convert object to TOON format"""
    if obj is None:
        return ''

    lines: List[str] = []

    # Handle root-level arrays (from CSV/XLSX uploads)
    if isinstance(obj, list):
        if len(obj) == 0:
            return 'data[0]'
        elif is_array_of_objects(obj):
            return format_object_array('data', obj)
        elif is_array_of_primitives(obj):
            values = ','.join(
                escape_value(v) if isinstance(v, str) else str(v)
                for v in obj
            )
            return f"data[{len(obj)}],{values}"
        else:
            # Mixed array
            for index, item in enumerate(obj):
                if isinstance(item, dict):
                    lines.append(convert_to_toon(item, f"data[{index}]"))
                else:
                    val = escape_value(item) if isinstance(item, str) else str(item)
                    lines.append(f"data[{index}],{val}")
            return '\n'.join(filter(None, lines))

    if not isinstance(obj, dict):
        return ''

    for key, value in obj.items():
        full_key = f"{prefix}.{key}" if prefix else key

        if value is None:
            lines.append(f"{full_key},null")
        elif isinstance(value, bool):
            lines.append(f"{full_key},{str(value).lower()}")
        elif isinstance(value, (int, float)):
            lines.append(f"{full_key},{value}")
        elif isinstance(value, str):
            escaped_value = escape_value(value)
            lines.append(f"{full_key},{escaped_value}")
        elif isinstance(value, list):
            if len(value) == 0:
                lines.append(f"{full_key}[0]")
            elif is_array_of_objects(value):
                lines.append(format_object_array(full_key, value))
            elif is_array_of_primitives(value):
                values = ','.join(
                    escape_value(v) if isinstance(v, str) else str(v)
                    for v in value
                )
                lines.append(f"{full_key}[{len(value)}],{values}")
            else:
                # Mixed array - indexed format
                for index, item in enumerate(value):
                    if isinstance(item, dict):
                        lines.append(convert_to_toon(item, f"{full_key}[{index}]"))
                    else:
                        val = escape_value(item) if isinstance(item, str) else str(item)
                        lines.append(f"{full_key}[{index}],{val}")
        elif isinstance(value, dict):
            lines.append(convert_to_toon(value, full_key))

    return '\n'.join(filter(None, lines))


def format_object_array(key: str, array: List[Dict]) -> str:
    """Format array of objects in compact table format"""
    if len(array) == 0:
        return f"{key}[0]"

    # Get all unique keys
    all_keys: Set[str] = set()
    for obj in array:
        all_keys.update(obj.keys())
    keys = list(all_keys)

    # Header: arrayName[length]{key1,key2,...}
    header = f"{key}[{len(array)}]{{{','.join(keys)}}}"

    # Data rows
    rows = []
    for obj in array:
        row_values = []
        for k in keys:
            value = obj.get(k)
            if value is None:
                row_values.append('null')
            elif isinstance(value, bool):
                row_values.append(str(value).lower())
            elif isinstance(value, (int, float)):
                row_values.append(str(value))
            elif isinstance(value, str):
                row_values.append(escape_value(value))
            elif isinstance(value, (dict, list)):
                row_values.append(json.dumps(value))
            else:
                row_values.append(str(value))
        rows.append('  ' + ','.join(row_values))

    return '\n'.join([header] + rows)


def is_array_of_objects(arr: List) -> bool:
    """Check if array contains only objects"""
    if len(arr) == 0:
        return False
    return all(isinstance(item, dict) for item in arr)


def is_array_of_primitives(arr: List) -> bool:
    """Check if array contains only primitives"""
    if len(arr) == 0:
        return False
    return all(
        item is None or isinstance(item, (str, int, float, bool))
        for item in arr
    )


def escape_value(value: str) -> str:
    """Escape values containing commas, newlines, or quotes"""
    if ',' in value or '\n' in value or '"' in value:
        return '"' + value.replace('"', '""') + '"'
    return value


def estimate_tokens(text: str) -> int:
    """Estimate token count for text"""
    if not text:
        return 0

    char_count = len(text)
    word_count = len([w for w in text.split() if w])
    special_chars = len(re.findall(r'[{}\[\]:,\n]', text))

    char_based_estimate = char_count / 4
    word_based_estimate = word_count + special_chars * 0.5

    return round(char_based_estimate * 0.6 + word_based_estimate * 0.4)


def calculate_metrics(json_string: str, toon_string: str) -> Dict[str, Any]:
    """Calculate conversion metrics"""
    json_tokens = estimate_tokens(json_string)
    toon_tokens = estimate_tokens(toon_string)
    tokens_saved = json_tokens - toon_tokens
    reduction_percent = (
        f"{(tokens_saved / json_tokens * 100):.1f}"
        if json_tokens > 0
        else "0"
    )

    return {
        "jsonTokens": json_tokens,
        "toonTokens": toon_tokens,
        "tokensSaved": tokens_saved,
        "reductionPercent": reduction_percent
    }
